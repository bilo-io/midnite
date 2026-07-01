import{n as s,T as R}from"./iframe-C6uDgmxk.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-5a-foet0.js";import{P as H}from"./project-modal-B_YWz_P0.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CE7gPtle.js";import"./index-DryOYERO.js";import"./check-CF5OJWrz.js";import"./triangle-alert-CmKsWAsO.js";import"./export-menu-Cwkqolf7.js";import"./client-CBvuE4Ie.js";import"./markdown-preview-CjVYVb14.js";import"./file-text-BJ691j8X.js";import"./copy-CH9RWOap.js";import"./loader-circle-BKqP9kj1.js";import"./api-BF5NoeS0.js";import"./inbound-C7DsSwT4.js";import"./folder-open-BJI7Fckb.js";import"./folder-DOyjX7YN.js";import"./project-tag-Djx7rTbl.js";import"./tag-color-picker-Coz4GNTS.js";import"./source-list-editor-fdti8n_i.js";import"./source-icon-DtwiHqM_.js";import"./globe-CHe4pvWC.js";import"./sticky-note-CgOhNO5X.js";import"./plus-DyKmy8YQ.js";import"./external-link-BlktDvm2.js";import"./task-row-pygLUXaR.js";import"./blocked-badge-CQ8Y1Ea_.js";import"./selectable-icon-BfHAuUUM.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-D61ig-17.js";import"./pencil-DmZrwIkM.js";import"./trash-2-Qqqliyo6.js";import"./refresh-cw-Ig30sJgw.js";import"./index-CBLlcddW.js";import"./lightbulb-xAKaDDvG.js";import"./templates-B6M1OYb3.js";import"./sparkles-BAzB6jfi.js";import"./brain-DTlP7Daw.js";import"./chevron-right-Crft2gtY.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
