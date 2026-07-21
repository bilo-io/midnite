import{l as n,T as R}from"./iframe-BMnGZiab.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BZ_YnPX6.js";import{P as H}from"./project-modal-BsJcQvjV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Cu1tsKkm.js";import"./index-BISzOKrZ.js";import"./Select-ef7c0426.esm-CduuutyY.js";import"./chevron-down-B3KkTREy.js";import"./check-kjn7ZuW8.js";import"./triangle-alert-TRgcxMb8.js";import"./export-menu-D0CvsM3o.js";import"./client-BpbU-ITQ.js";import"./markdown-preview-ChB3QVMY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-B4bQniO9.js";import"./copy-BxK9oqOy.js";import"./file-code-corner-zzgpMxKG.js";import"./loader-circle-D7Gdd028.js";import"./api-CJSY_K2f.js";import"./site-links-BhZk_F72.js";import"./folder-open-Z6JDbkP2.js";import"./folder-CgOQ-D20.js";import"./tag-color-picker-Cd-kgmqL.js";import"./project-tag-Dv4g2u09.js";import"./sparkles-DcIE4x8q.js";import"./brain-AL95uazB.js";import"./chevron-right-BegIN2uU.js";import"./markdown-editor-CndG4RmG.js";import"./pencil-D1U3h1rB.js";import"./trash-2-ZkaiBI5W.js";import"./templates-B6M1OYb3.js";import"./plus-COkMAY3T.js";import"./task-row-DezmUbhP.js";import"./blocked-badge-DRX02Nsw.js";import"./selectable-icon-C0y8SGh5.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Dm6q2BAS.js";import"./arrow-left-C7hn4qDP.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,Ta={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ea=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ea as __namedExportsOrder,Ta as default};
