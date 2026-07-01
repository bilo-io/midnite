import{n as s,T as R}from"./iframe-CMCZONSf.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-Abq9Ms0V.js";import{P as H}from"./project-modal-p15LJiJd.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cc1knxhb.js";import"./index-Cw0U76p2.js";import"./check-DN5yYC7t.js";import"./triangle-alert-CSRgyG0o.js";import"./export-menu-EfZklpP4.js";import"./client-OEv1aSiz.js";import"./markdown-preview-Seq-JVcm.js";import"./file-text-CMJ908kx.js";import"./copy-tJwtjMKo.js";import"./loader-circle-lx2qMLY4.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open-Ygj-1jpW.js";import"./folder-DWw3kfQM.js";import"./project-tag-D2tF2nel.js";import"./tag-color-picker-BzL7dy8_.js";import"./source-list-editor-HqKO5Moi.js";import"./source-icon-DVRhByXA.js";import"./globe-DQsZ4p0x.js";import"./sticky-note-Drjl9omF.js";import"./plus-DhZkyQOA.js";import"./external-link-DLRI_m0E.js";import"./task-row-D2GsYqRL.js";import"./blocked-badge-D1yzvfhu.js";import"./selectable-icon-WOHUmuzJ.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CfvfKRT-.js";import"./pencil-BYHc9dWS.js";import"./trash-2-JwUB44iD.js";import"./refresh-cw-CgBRTrr_.js";import"./index-_AGFi5zq.js";import"./lightbulb-DFsuWQoz.js";import"./templates-B6M1OYb3.js";import"./sparkles-RenkBhdz.js";import"./brain-BwFqFF9J.js";import"./chevron-right-D3PkVdp5.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
